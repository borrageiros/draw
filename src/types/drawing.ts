import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export interface DrawingData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export interface Drawing {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isPublic: boolean;
  data: DrawingData;
}

export interface DrawingSaveRequest {
  title: string;
  description?: string;
  isPublic: boolean;
  data: DrawingData;
}

export interface DrawingUpdateRequest {
  id: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
  data?: DrawingData;
}

export interface DrawingListItem {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  thumbnail?: string;
}
