import assert from "node:assert/strict";
import "../core/adapter.js";
import { createHtml } from "../core/page.js";

suite("SSR serialization", () => {
  test("escapes page metadata and prevents style and link breakouts", () => {
    const config = {
      title: "</title><script>alert(1)</script>",
      description: '" /><script>alert(2)</script>',
      style: 'body { content: "</style><script>alert(3)</script>"; }',
      links: [{ rel: "stylesheet", href: '" onload="alert(4)', onload: "alert(5)", 'bad" name': "value" }],
    };
    const html = createHtml("<p>trusted body</p>", config);
    assert.ok(html.includes("&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(html.includes("&quot; /&gt;&lt;script&gt;alert(2)&lt;/script&gt;"));
    assert.ok(html.includes("\\3c /style>\\3c script>alert(3)\\3c /script>"));
    assert.ok(html.includes('href="&quot; onload=&quot;alert(4)"'));
    assert.ok(!html.includes('onload="alert(5)"'));
    assert.equal((html.match(/<script/g) || []).length, 1);
    assert.equal(config.title, "</title><script>alert(1)</script>");
  });
  test("escapes text and attributes without changing DOM values", () => {
    const element = document.createElement("div");
    const text = document.createTextNode('<img src=x onerror=alert(1)> & "quoted"');
    element.appendChild(text);
    element.setAttribute("title", '" onmouseover="alert(1) & < >');
    assert.equal(text.textContent, '<img src=x onerror=alert(1)> & "quoted"');
    assert.equal(
      element.outerHTML,
      '<div title="&quot; onmouseover=&quot;alert(1) &amp; &lt; &gt;">&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quoted&quot;</div>',
    );
    text.textContent = "<updated>";
    assert.equal(element.innerHTML, "&lt;updated&gt;");
  });
});
