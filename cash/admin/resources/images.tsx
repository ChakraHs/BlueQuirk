import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  FileInput,
  FileField,
  List,
  Datagrid,
  TextField,
  ImageField
} from "react-admin";
import type { Accept } from "react-dropzone";

// List view of images
export const ImageList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="fileName" />
      <ImageField source="url" title="fileName" />
    </Datagrid>
  </List>
);

// Create view for uploading images
export const ImageCreate = (props: any) => {
  const imageAccept: Accept = {
    "image/*": []
  };

  return (
    <Create {...props}>
      <SimpleForm>
        <TextInput source="fileName" label="Image Name" />
        <FileInput source="file" label="Upload Image" accept={imageAccept}>
          <FileField source="src" title="title" />
        </FileInput>
      </SimpleForm>
    </Create>
  );
};
