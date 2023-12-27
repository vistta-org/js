"use strict";
import { createElement, cloneElement } from "../element"
import { useContext, useStyle, useRef, Ref, useState, State, useEffect, useForm } from "../hooks";
import { useRoute } from "./router";
import { Store, useStore } from "./store";
import { Profiler, Suspense, TryCatch, Render, async } from "../components";
import * as utils from "../../utils";

const { system } = utils;

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
  useStore,
  Store,
  Profiler,
  Suspense,
  TryCatch,
  Render,
  async,
  ...utils,
});
