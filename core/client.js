"use strict";
import VirtualDom from "./dom";
import { useRef, useState, useEffect } from "./hooks";
import Route, { useRoute, buildUrl, isAppUrl } from "./router";
import { useSocket } from "./socket";
// import { store, createStoreConfig } from "./store";
import * as utils from "../utils";

const { system, isValidUrl } = utils;
system.set("vistta", {
  useRef,
  useState,
  useEffect,
  useRoute,
  useSocket,
  //createStoreConfig,
  ...utils,
});

Route.navigate = async function (href, callback) {
  const force = href === true;
  if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
  if (!isAppUrl(href)) return (location.href = href);
  if (!force && this.active === href) return;
  const cached = this.get(href);
  if (force || !cached) {
    const content = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app`)).default;
    //const config = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app/config`))?.config;
    //if (config?.store) store.set(config.store);
    const dom = new VirtualDom(this);
    return dom.render(content, () => {
      this.set(href, dom);
      callback && callback();
    });
  }
  this.active = new URL(href).pathname;
  this.replaceChildren(...cached.children);
  callback && callback();
};
