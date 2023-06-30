export const messages = [{ username: "Global", message: "Welcome to the chat!" }];
const users = [];

export default function handler(req, res) {
  const { username } = req.body;
  if (users.includes(username)) return res.json({ error: "Username already taken" });
  users.push(username);
  res.status(200).json({ success: true, messages });
}
