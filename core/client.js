"use strict";
import { createElement, cloneElement } from "./element"
import { useContext, useStyle, useRef, Ref, useState, State, useEffect, useForm } from "./hooks";
import { useRoute } from "./router";
import { useSocket } from "./socket";
import { Store, useStore } from "./store";
import { Profiler, Suspense, TryCatch, async } from "./components";
import { system } from "../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  useContext,
  useStyle,
  useRef,
  Ref,
  useState,
  State,
  useEffect,
  useForm,
  useRoute,
  useSocket,
  useStore,
  Store,
  Profiler,
  Suspense,
  TryCatch,
  async
});