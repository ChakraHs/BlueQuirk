"use client";

import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ReferenceArrayInput,
  SelectArrayInput,
  useDataProvider,
  useNotify,
} from "react-admin";

export const ProductCreate = () => {
  const [allAttributes, setAllAttributes] = React.useState<any[]>([]);
  const [selectedAttrs, setSelectedAttrs] = React.useState<
    { attributeId: number; values: number[] }[]
  >([]);
  const dataProvider = useDataProvider();
  const notify = useNotify();

  // Load attributes from backend
  React.useEffect(() => {
    dataProvider
      .getList("attributes", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "id", order: "ASC" },
      })
      .then(({ data }) => setAllAttributes(data))
      .catch(() => notify("Error loading attributes", { type: "error" }));
  }, [dataProvider, notify]);

  // Add a new attribute selector
  const addAttribute = () =>
    setSelectedAttrs([...selectedAttrs, { attributeId: 0, values: [] }]);

  // Update selected attribute
  const updateAttribute = (index: number, attrId: number) => {
    const copy = [...selectedAttrs];
    copy[index].attributeId = attrId;
    copy[index].values = [];
    setSelectedAttrs(copy);
  };

  // Update selected values for an attribute
  const updateValues = (index: number, values: number[]) => {
    const copy = [...selectedAttrs];
    copy[index].values = values;
    setSelectedAttrs(copy);
  };

  // Remove attribute
  const removeAttribute = (index: number) => {
    const copy = [...selectedAttrs];
    copy.splice(index, 1);
    setSelectedAttrs(copy);
  };

  return (
    <Create>
      <SimpleForm
        onSubmit={async (values: any) => {
          const payload = {
            ...values,
            attributes: selectedAttrs.map((a) => ({
              attributeId: a.attributeId,
              valueIds: a.values,
            })),
          };

          try {
            await dataProvider.create("products", { data: payload });
            notify("Product created successfully", { type: "success" });
          } catch (error) {
            console.error(error);
            notify("Error creating product", { type: "error" });
          }
        }}
      >
        {/* Basic product info */}
        <TextInput source="name" label="Product Name" fullWidth />
        <NumberInput source="price" label="Price" />
        <TextInput source="description" label="Description" multiline fullWidth />

        {/* Images */}
        <ReferenceArrayInput source="images" reference="images">
          <SelectArrayInput optionText="fileName" />
        </ReferenceArrayInput>

        {/* Dynamic attributes */}
        <div style={{ marginTop: 20 }}>
          <button type="button" onClick={addAttribute}>
            + Add Attribute
          </button>

          {selectedAttrs.map((attr, index) => {
            const attribute = allAttributes.find((a) => a.id === attr.attributeId);

            return (
              <div
                key={index}
                style={{ border: "1px solid #ccc", padding: 10, marginTop: 10 }}
              >
                <button type="button" onClick={() => removeAttribute(index)}>
                  Remove
                </button>

                <select
                  value={attr.attributeId}
                  onChange={(e) =>
                    updateAttribute(index, parseInt(e.target.value))
                  }
                  style={{ marginLeft: 10, marginBottom: 10 }}
                >
                  <option value={0}>-- Select Attribute --</option>
                  {allAttributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {attribute && (
                  <select
                    multiple
                    value={attr.values.map(String)}
                    onChange={(e) =>
                      updateValues(
                        index,
                        Array.from(e.target.selectedOptions, (o) =>
                          parseInt(o.value)
                        )
                      )
                    }
                    style={{ display: "block", marginTop: 5 }}
                  >
                    {attribute.values.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </SimpleForm>
    </Create>
  );
};
