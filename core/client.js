"use strict";
import { useContext, useStyle, useRef, useState, useEffect, useEvent } from "./hooks";
import { useRoute } from "./router";
import { useSocket } from "./socket";
import { Store, useStore } from "./store";
import { Profiler, Suspense, TryCatch, async } from "./components";
import * as utils from "../utils";

const { system } = utils;

system.set("vistta", {
  useContext,
  useStyle,
  useRef,
  useState,
  useEffect,
  useEvent,
  useRoute,
  useSocket,
  useStore,
  Store,
  Profiler,
  Suspense,
  TryCatch,
  async,
  ...utils,
});
