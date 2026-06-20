"use client";

import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  EditButton,
  ArrayField,
  SingleFieldList,
  ChipField,
  TopToolbar,
  CreateButton,
} from "react-admin";

// Custom toolbar with create button
const ProductListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const ProductList = () => (
  <List actions={<ProductListActions />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <NumberField source="price" />
      <ArrayField source="images">
        <SingleFieldList>
          <ChipField source="fileName" />
        </SingleFieldList>
      </ArrayField>
      <ArrayField source="attributes">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      <EditButton />
    </Datagrid>
  </List>
);
