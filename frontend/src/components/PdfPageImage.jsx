export default function PdfPageImage({ src, pageNo }) {
  function blockContextMenu(event) {
    event.preventDefault();
  }

  return (
    <div className="page-wrap" onContextMenu={blockContextMenu}>
      <img
        className="page-image"
        src={src}
        alt={`PDF Page ${pageNo}`}
        draggable={false}
        onContextMenu={blockContextMenu}
      />
    </div>
  );
}
