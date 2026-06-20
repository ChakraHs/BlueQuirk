"use client";

import * as React from "react";
import { Admin, Resource, ListGuesser, EditGuesser } from "react-admin";
import { AdminLayout } from "./AdminLayout";
import { adminTheme } from "./theme";
import { ImageUploadModal } from "./ImageUploadModal";
import { ImageList } from "./ImageList";
import { AttributeCreate } from "./resources/attributes/AttributeCreate";
import { AttributeList } from "./resources/attributes/AttributeList";
import { AttributeEdit } from "./resources/attributes/AttributeEdit";
import { ProductList } from "./resources/products/ProductList";
import { ProductEdit } from "./resources/products/ProductEdit";
import { ProductCreate } from "./resources/products/ProductCreate";

import { authProvider } from "../auth/authProvider";
import { dataProvider } from "../auth/dataProvider";
import { LoginPage } from "../auth/login/LoginPage";

export default function AdminPage() {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      loginPage={LoginPage}
      layout={AdminLayout}
      theme={adminTheme}
      dashboard={() => (
        <div style={{ padding: 20 }}>
          <h1>Welcome to Blue Quirk Admin</h1>
          <ImageUploadModal onUploadSuccess={() => window.location.reload()} />
        </div>
      )}
    >
      <Resource name="products" list={ProductList} edit={ProductEdit} create={ProductCreate} />
      <Resource name="users" list={ListGuesser} edit={EditGuesser} />
      <Resource name="orders" list={ListGuesser} edit={EditGuesser} />
      <Resource name="images" list={ImageList} />
      <Resource name="attributes" list={AttributeList} edit={AttributeEdit} create={AttributeCreate} />
    </Admin>
  );
}
