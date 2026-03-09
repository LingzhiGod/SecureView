export default function PdfPageImage({ src, pageNo }) {
  return (
    <div className="page-wrap">
      <img className="page-image" src={src} alt={`PDF Page ${pageNo}`} draggable={false} />
    </div>
  );
}
