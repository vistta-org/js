"use strict";
import { createElement, cloneElement } from "../element"
import { useContext, useRef, Ref, useState, State, useEffect, useForm } from "../hooks";
import { Profiler, Suspense, TryCatch, Render, Scope, async } from "../components";
import { useRoute } from "./router";
import { Store } from "../store";
import { system, isBrowser } from "../../utils";

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
  useSocket: () => console.warn("Socket is not available on built apps."),
  Store,
  Profiler,
  Suspense,
  TryCatch,
  Render,
  Scope,
  async,
  isBrowser,
});
