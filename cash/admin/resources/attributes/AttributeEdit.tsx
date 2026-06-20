"use client";

import * as React from "react";
import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
} from "react-admin";

export const AttributeEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" label="Attribute Name" fullWidth />
      <SelectInput
        source="type"
        label="Type"
        choices={[
          { id: "COLOR", name: "Color" },
          { id: "RANGE", name: "Range" },
          { id: "SIZE", name: "Size" },
          { id: "TEXT", name: "Text" },
        ]}
      />

      {/* Attribute values */}
      <ArrayInput source="values">
        <SimpleFormIterator>
          <TextInput source="value" label="Value" fullWidth />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);
