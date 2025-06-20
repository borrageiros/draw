# Stage 1: Installer - Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install all dependencies, including devDependencies for the build step
RUN yarn install --frozen-lockfile


# Stage 2: Builder - Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code
COPY . .

# Build the Next.js application for production
RUN yarn build


# Stage 3: Runner - Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Create a non-root user for security purposes
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
RUN yarn install --production --frozen-lockfile

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

# Change ownership of the files to the non-root user
RUN chown -R nextjs:nodejs /app/.next
RUN chown -R nextjs:nodejs /app/public
RUN chown -R nextjs:nodejs /app/server.js

# Switch to the non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 3000

# Set the port environment variable
ENV PORT 3000

# The command to start the application
CMD ["node", "server.js"]
