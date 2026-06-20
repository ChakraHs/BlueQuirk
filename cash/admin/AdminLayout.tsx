// src/admin/AdminLayout.tsx
"use client";

import * as React from "react";
import { Layout, AppBar, Menu, Sidebar } from "react-admin";
import { Box, colors, Typography } from "@mui/material";

const MyAppBar = (props: any) => (
  <AppBar {...props} style={{color: "white"}}>
    <Typography variant="h6" style={{ flex: 1, color:"white" }}>
      Blue Quirk Shop Admin
    </Typography>
  </AppBar>
);

const MySidebar = (props: any) => (
  <Sidebar {...props}>
    <Menu>
      {/* You can add custom links here */}
    </Menu>
  </Sidebar>
);

export const AdminLayout = (props: any) => <Layout {...props} appBar={MyAppBar} sidebar={MySidebar} />;
