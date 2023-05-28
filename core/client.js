"use strict";
import { useRef, useState, useEffect } from "./hooks";
import { useRoute } from "./router";
import { useSocket } from "./socket";
import { Store, useStore } from "./store";
import * as utils from "@/utils";

const { system } = utils;

system.set("vistta", {
  useRef,
  useState,
  useEffect,
  useRoute,
  useSocket,
  useStore,
  Store,
  ...utils,
});
