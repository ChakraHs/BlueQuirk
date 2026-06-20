"use client";

import * as React from "react";
import { Create, SimpleForm, TextInput, SelectInput } from "react-admin";

export const AttributeCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Attribute Name" />
      <SelectInput
        source="type"
        label="Attribute Type"
        choices={[
          { id: "COLOR", name: "Color" },
          { id: "SIZE", name: "Size" },
          { id: "RANGE", name: "Range" },
          { id: "TEXT", name: "Text" },
          { id: "NUMBER", name: "Number" },
        ]}
      />
    </SimpleForm>
  </Create>
);
