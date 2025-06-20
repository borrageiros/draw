import mongoose, { Document, Schema } from "mongoose";

export interface IDrawing extends Document {
  id: string;
  owner_id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  shared_with: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DrawingSchema = new Schema<IDrawing>(
  {
    owner_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    shared_with: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Drawing ||
  mongoose.model<IDrawing>("Drawing", DrawingSchema);
