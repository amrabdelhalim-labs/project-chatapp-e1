import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import Profile from "./profile";
import Chat from "./chat";
import Community from "./community";

const Tab = createMaterialTopTabNavigator();

export default function Home() {
  return (
    <Tab.Navigator initialRouteName="Chat">
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Chat" component={Chat} />
      <Tab.Screen name="Community" component={Community} />
    </Tab.Navigator>
  );
};