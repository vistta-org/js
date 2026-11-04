/* eslint-disable no-unused-vars */

export class Socket {
  /**
   * Connects to the socket.
   * @param {string} host - The host to connect to.
   * @param {object} options - The options for the connection.
   */
  static connect(host, options) {
    throw new Error("Socket is not available on server environment.");
  }

  /**
   * Emits an event to the socket.
   * @param {string} event - The event name.
   * @param {...any} args - The arguments to pass with the event.
   */
  static emit(event, ...args) {
    throw new Error("Socket is not available on server environment.");
  }

  /**
   * Registers an event listener on the socket.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback function to execute when the event is triggered.
   * @param {{ mobile?: { background?: boolean } }} [options] - Options for mobile background delivery.
   */
  static on(event, callback, { mobile: { background = false } = {} } = {}) {
    throw new Error("Socket is not available on server environment.");
  }

  /**
   * Removes an event listener from the socket.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback function to remove.
   */
  static off(event, callback) {
    throw new Error("Socket is not available on server environment.");
  }
}

export default Socket;
