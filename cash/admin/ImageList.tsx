// src/admin/ImageList.tsx
"use client";

import * as React from "react";
import { List, Datagrid, TextField } from "react-admin";
import { ImageGallery } from "./ImageGallery";
import { ImageUploadModal } from "./ImageUploadModal";

export const ImageList = (props: any) => {
  return (
    <List {...props} title="Images">
      <div style={{ padding: 16 }}>
        {/* Upload button */}
        <ImageUploadModal />

        {/* Gallery */}
        <ImageGallery />
      </div>

      {/* Optional: keep a datagrid for quick editing */}
      <Datagrid>
        <TextField source="id" />
        <TextField source="fileName" />
        <TextField source="url" />
      </Datagrid>
    </List>
  );
};
