"use strict";
import { createElement, cloneElement } from "../element"
import { useContext, useStyle, useRef, Ref, useState, State, useEffect, useForm } from "../hooks";
import { useRoute } from "./router";
import { Store } from "./store";
import { Profiler, Suspense, TryCatch, Render, async } from "../components";
import { system, isBrowser } from "../../utils";

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
  useSocket: () => console.warn("Socket is not available on built apps."),
  Store,
  Profiler,
  Suspense,
  TryCatch,
  Render,
  async,
  isBrowser,
});
