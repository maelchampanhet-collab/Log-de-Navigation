import PDFKit
import AppKit
import Vision
// Usage: vacocr file.pdf  -> imprime les lignes OCR de l'en-tête de la page carte (page 1), haut de page
let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
guard let p = d.page(at: 0) else { exit(1) }
let r = p.bounds(for: .mediaBox)
let s: CGFloat = CGFloat(Double(CommandLine.arguments[2])!)
let img = p.thumbnail(of: NSSize(width: r.width*s, height: r.height*s), for: .mediaBox)
guard let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let h = CGFloat(cg.height), w = CGFloat(cg.width)
// bande haute : 0 → 24 % de la hauteur de page
let crop = cg.cropping(to: CGRect(x: 0, y: 0, width: w, height: h*0.24))!
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: crop, options: [:])
try handler.perform([req])
let obs = (req.results ?? []).sorted { a, b in
  if abs(a.boundingBox.midY - b.boundingBox.midY) > 0.02 { return a.boundingBox.midY > b.boundingBox.midY }
  return a.boundingBox.minX < b.boundingBox.minX }
for o in obs { if let t = o.topCandidates(1).first { print(String(format: "%.2f,%.2f\t", o.boundingBox.minX, o.boundingBox.midY) + t.string) } }
