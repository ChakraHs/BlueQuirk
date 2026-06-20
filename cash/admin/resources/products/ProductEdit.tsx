"use client";

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
  useRecordContext
} from "react-admin";
import ImageSelector from "../imageSelector";

// Custom component to render attributes with values
const AttributeValues = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <div className="space-y-4">
      {record.attributes?.map((attr: any, attrIndex: number) => (
        <div key={attr.id} className="p-4 border rounded-xl">
            <h3 className="font-semibold mb-2">{attr.name}</h3>
            <div className="grid grid-cols-2 gap-3">
            {attr.values.map((val: any, valIndex: number) => (
                <div key={val.id} className="flex items-center space-x-2">
                <BooleanInput
                    source={`attributes[${attrIndex}].values[${valIndex}].selected`}
                    label={val.value}
                />
                </div>
            ))}
            </div>
        </div>
        ))}

    </div>
  );
};

export const ProductEdit = () => (
  <Edit>
    <SimpleForm>
      {/* Basic product info */}
      <TextInput source="name" label="Product Name" fullWidth />
      <NumberInput source="price" label="Price" />

      <TextInput
        source="description"
        label="Description (HTML)"
        fullWidth
        multiline
        minRows={5}
        />


      {/* Status with best-practice values */}
      <SelectInput
        source="status"
        label="Status"
        choices={[
          { id: "DRAFT", name: "Draft" },
          { id: "PUBLISHED", name: "Published" },
          { id: "ARCHIVED", name: "Archived" }
        ]}
      />

      {/* Attributes section */}
      <h2 className="text-lg font-bold mt-6 mb-2">Attributes</h2>
      <AttributeValues />
      <ImageSelector />
    </SimpleForm>
  </Edit>
);
