import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["strong", "br", "p", "ul", "ol", "li"];
const ALLOWED_ATTR = [];

export const stripDashSeparators = (text = "") => {
  let out = String(text || "");
  out = out.replace(/^\s*[-–—_]{2,}\s*$/gm, "");
  out = out.replace(/\s+[-–—]{2,}\s+/g, ", ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
};

export const normalizeAssistantBold = (text = "") => {
  let out = stripDashSeparators(text);
  out = out.replace(/\*{3}([^*]+)\*{3}/g, "<strong>$1</strong>");
  out = out.replace(/\*{2}([^*]+)\*{2}/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  return out;
};

export const formatAssistantMessageHtml = (text = "") => {
  const normalized = normalizeAssistantBold(text);
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !/^[-–—_]{2,}$/.test(block));

  const html = paragraphs.length
    ? paragraphs
        .map((block) => {
          const withBreaks = block.replace(/\n/g, "<br/>");
          return `<p>${withBreaks}</p>`;
        })
        .join("")
    : `<p>${normalized.replace(/\n/g, "<br/>")}</p>`;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
};
