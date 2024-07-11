#!/usr/bin/env node
"use strict";

const { cwd } = require("process");
const { readFileSync, writeFileSync } = require("fs");

const routesManifest = "./.next/routes-manifest.json";
const manifest = JSON.parse(readFileSync(routesManifest, "utf8"));
const { basePath, dynamicRoutes, staticRoutes } = manifest;

const requiredServerFiles = "./.next/required-server-files.json";
const { config } = JSON.parse(readFileSync(requiredServerFiles, "utf-8"));

function createRedirects() {
  return `
# Redirect URLs with trailing slashes to the same URL without trailing slash
if ($request_uri ~ ^(.*)/+$) {
    return 301 $scheme://$host$1;
}`;
}

const redirectRules = createRedirects();

const routes = staticRoutes.concat(dynamicRoutes).map((route) => {
  let { page, regex } = route;

  if (route.page === "/") {
    page = "/index";
    regex = basePath ? `^${basePath}${regex.slice(2)}` : regex;
  } else {
    if (config.trailingSlash) {
      page = `${route.page}/index`;
    }
    regex = `^${basePath || ""}${regex.slice(1)}`;
  }

  return `
location ~ ${regex} {
    try_files ${page}.html /index.html;
}`;
});
const nginxConfig = `
${redirectRules}

${routes.join("\n")}
`;

writeFileSync("./next-routes.conf", nginxConfig);

console.log(`Nginx routes configuration written to ${cwd()}/next-routes.conf`);
