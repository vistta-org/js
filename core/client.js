"use strict";
import { useContext, useStyle, useRef, useState, useEffect } from "./hooks";
import { useRoute } from "./router";
import { useSocket } from "./socket";
import { Store, useStore } from "./store";
import { Profiler, Suspense, TryCatch, async, context } from "./components";
import * as utils from "../utils";

const { system } = utils;

system.set("vistta", {
  useContext,
  useStyle,
  useRef,
  useState,
  useEffect,
  useRoute,
  useSocket,
  useStore,
  Store,
  Profiler,
  Suspense,
  TryCatch,
  async,
  context,
  ...utils,
});
