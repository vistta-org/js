import Template from "./_template";

const containerStyle = {
  height: "100%",
  display: "flex",
  flexFlow: "column wrap",
  justifyContent: "center"
};

const titleStyle = {
  fontSize: "7.5rem",
  color: "var(--brand-color)",
  textAlign: "center"
};

const textStyle = {
  fontSize: "3rem",
  textAlign: "center"
};

const NotFound = () => {
  return <Template>
    <div style={containerStyle}>
      <h1 style={titleStyle}>404</h1>
      <p style={textStyle}>Page Not Found</p>
    </div>
  </Template>;
};

export default NotFound;
