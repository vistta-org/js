export default function middleware(req, res, next) {
  console.log("here docs");
  next();
}