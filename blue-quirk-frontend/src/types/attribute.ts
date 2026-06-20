import { AttributeValue } from "./attributeValue";

export interface Attribute {
  id: number;
  name: string;
  type: string;
  values: AttributeValue[];
}