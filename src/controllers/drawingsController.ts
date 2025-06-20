import Drawing, { IDrawing } from "@/models/Drawing";
import dbConnect from "@/lib/db/connection";
import User from "@/models/User";

export async function createDrawing(data: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawingData: any;
  userId: string;
}) {
  try {
    await dbConnect();
    const { title, drawingData, userId } = data;

    // Verificar que el usuario exista (opcional, pero buena práctica)
    const owner = await User.findById(userId);
    if (!owner) {
      return { error: "Owner not found", status: 404 };
    }

    const newDrawing = await Drawing.create({
      owner_id: userId,
      title,
      data: drawingData,
      shared_with: [], // Inicialmente no compartido
    });

    return { data: newDrawing, status: 201 };
  } catch (error) {
    console.error("Error in createDrawing:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function getUserDrawings(userId: string) {
  try {
    await dbConnect();
    const drawings = await Drawing.find({
      $or: [{ owner_id: userId }, { shared_with: userId }],
    }).sort({
      updatedAt: -1,
    });
    return { data: drawings, status: 200 };
  } catch (error) {
    console.error("Error in getUserDrawings:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function getDrawingById(drawingId: string, userId: string) {
  try {
    await dbConnect();
    const drawing = await Drawing.findById(drawingId);

    if (!drawing) {
      return { error: "Drawing not found", status: 404 };
    }

    const isOwner = drawing.owner_id.toString() === userId;
    const isSharedWithUser = drawing.shared_with
      .map((id: string) => id.toString())
      .includes(userId);

    if (!isOwner && !isSharedWithUser) {
      return { error: "Forbidden", status: 403 };
    }

    return { data: drawing, status: 200 };
  } catch (error) {
    console.error("Error in getDrawingById:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function updateDrawing(
  drawingId: string,
  userId: string,
  updateData: Partial<Pick<IDrawing, "title" | "data">> & { shared_with_users?: string[] }
) {
  try {
    await dbConnect();
    const drawing = await Drawing.findById(drawingId);

    if (!drawing) {
      return { error: "Drawing not found", status: 404 };
    }

    const isOwner = drawing.owner_id.toString() === userId;
    const isSharedWithUser = drawing.shared_with
      .map((id: string) => id.toString())
      .includes(userId);

    if (!isOwner && !isSharedWithUser) {
      return { error: "Forbidden", status: 403 };
    }

    if (updateData.title !== undefined) {
      drawing.title = updateData.title;
    }
    if (updateData.data !== undefined) {
      drawing.data = updateData.data;
    }

    if (updateData.shared_with_users !== undefined) {
      if (!isOwner) {
        return { error: "Forbidden: Only the owner can change sharing settings", status: 403 };
      }
      drawing.shared_with = updateData.shared_with_users;
    }

    drawing.updatedAt = new Date();
    const updatedDrawing = await drawing.save();

    return { data: updatedDrawing, status: 200 };
  } catch (error) {
    console.error("Error in updateDrawing:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function deleteDrawing(drawingId: string, userId: string) {
  try {
    await dbConnect();
    const drawing = await Drawing.findById(drawingId);

    if (!drawing) {
      return { error: "Drawing not found", status: 404 };
    }

    if (drawing.owner_id.toString() !== userId) {
      return { error: "Forbidden", status: 403 };
    }

    await Drawing.findByIdAndDelete(drawingId);

    return { data: { message: "Drawing deleted successfully" }, status: 200 };
  } catch (error) {
    console.error("Error in deleteDrawing:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function shareDrawingWithUser(
  drawingId: string,
  ownerUserId: string,
  userIdToShareWith: string
) {
  try {
    await dbConnect();
    const drawing = await Drawing.findById(drawingId);

    if (!drawing) {
      return { error: "Drawing not found", status: 404 };
    }

    if (drawing.owner_id.toString() !== ownerUserId) {
      return { error: "Forbidden: Only the owner can share this drawing", status: 403 };
    }

    const userToShare = await User.findById(userIdToShareWith);
    if (!userToShare) {
      return { error: "User to share with not found", status: 404 };
    }
    
    if (userIdToShareWith === ownerUserId) {
       return { error: "Cannot share drawing with the owner", status: 400 };
    }

    if (!drawing.shared_with.map((id: string) => id.toString()).includes(userIdToShareWith)) {
      drawing.shared_with.push(userIdToShareWith);
      drawing.updatedAt = new Date();
      await drawing.save();
    }

    return { data: drawing, status: 200 };
  } catch (error) {
    console.error("Error in shareDrawingWithUser:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function unshareDrawingWithUser(
  drawingId: string,
  ownerUserId: string,
  userIdToUnshare: string
) {
  try {
    await dbConnect();
    const drawing = await Drawing.findById(drawingId);

    if (!drawing) {
      return { error: "Drawing not found", status: 404 };
    }

    if (drawing.owner_id.toString() !== ownerUserId) {
      return { error: "Forbidden: Only the owner can modify sharing settings", status: 403 };
    }

    const initialSharedCount = drawing.shared_with.length;
    drawing.shared_with = drawing.shared_with.filter((id: string) => id.toString() !== userIdToUnshare);

    if (drawing.shared_with.length < initialSharedCount) {
      drawing.updatedAt = new Date();
      await drawing.save();
    }

    return { data: drawing, status: 200 };
  } catch (error) {
    console.error("Error in unshareDrawingWithUser:", error);
    return { error: "Internal server error", status: 500 };
  }
}
