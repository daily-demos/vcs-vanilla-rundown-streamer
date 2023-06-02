// callback passed to VCS.
// maps asset names to URLs in our /static folder.
export function getAssetUrlCb(name, namespace, type) {
  let basePath = document.location.pathname;
  let idx;
  if ((idx = basePath.lastIndexOf("/index.html")) !== -1) {
    basePath = basePath.substring(0, idx);
  }
  if (basePath.at(-1) !== "/") {
    basePath += "/";
  }

  if (type === "font") {
    return `${basePath}vcs/res/fonts/${name}`;
  } else if (type === "image") {
    if (namespace === "composition") {
      return `${basePath}vcs/composition-assets/${name}`;
    } else {
      return `${basePath}vcs/res/test-assets/${name}`;
    }
  }
  return name;
}
