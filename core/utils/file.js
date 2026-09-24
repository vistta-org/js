export class File {
  /**
   * Download a file
   *
   * @param {string} filename
   * @param {*} content
   * @param {string} [type]
   */
  static download(filename, content, type = "text/plain") {
    const element = document.createElement("a");
    const file = new Blob([content], { type });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
  }

  /**
   * Upload a file
   * @template {boolean | undefined} T
   * @param {{ multiple?: T, accept?: string }} [options]
   *
   * @returns {Promise<T extends true ? FileList : File | null>}
   */
  static upload(options = {}) {
    const element = document.createElement("input");
    element.type = "file";
    element.accept = options?.accept || "";
    element.multiple = options?.multiple || false;
    element.style.display = "none";
    document.body.appendChild(element);
    return new Promise((resolve) => {
      element.addEventListener("change", () => {
        const result = options?.multiple ? element.files : element.files[0];
        resolve(/** @type {any} */ (result));
        element.remove();
      });
      element.click();
    });
  }

  /**
   * Read a file as text
   *
   * @param {Blob} file
   * @param {Object} [options]
   * @param {"text" | "arraybuffer" | "data"} [options.type='text']
   * @returns {Promise<any>}
   */
  static read(file, type = "text") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      if (type === "text") reader.readAsText(file);
      else if (type === "arraybuffer") reader.readAsArrayBuffer(file);
      else if (type === "data") reader.readAsDataURL(file);
      else reject(new Error("Invalid file read type"));
    });
  }
}

export default File;
