"use client";

import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  TopToolbar,
  CreateButton,
} from "react-admin";

const AttributeListActions = () => (
  <TopToolbar>
    <CreateButton /> {/* <-- this shows the Create button */}
  </TopToolbar>
);

export const AttributeList = () => (
  <List actions={<AttributeListActions />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="type" />
      <EditButton />
    </Datagrid>
  </List>
);
