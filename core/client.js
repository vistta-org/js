"use strict";
import { createElement, cloneElement } from "./element"
import { useContext, useRef, Ref, useState, State, useEffect, useForm } from "./hooks";
import { Profiler, Suspense, TryCatch, Render, Scope, async } from "./components";
import { useRoute } from "./router";
import { useSocket } from "./socket";
import { Store } from "./store";
import { system, isBrowser } from "../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  useContext,
  useRef,
  Ref,
  useState,
  State,
  useEffect,
  useForm,
  useRoute,
  useSocket,
  Store,
  Profiler,
  Suspense,
  TryCatch,
  Render,
  Scope,
  async,
  isBrowser
});