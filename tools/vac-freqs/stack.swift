import PDFKit
import AppKit
// stack.swift out.png CODE... : empile la bande d'en-tête (12–21 % de la hauteur) de la page 1 de chaque VAC
let a = CommandLine.arguments
var imgs: [CGImage] = []
for c in a[2...] {
  let d = PDFDocument(url: URL(fileURLWithPath: "vac/\(c).pdf"))!
  let p = d.page(at: 0)!
  let r = p.bounds(for: .mediaBox)
  let s: CGFloat = 2.2
  let img = p.thumbnail(of: NSSize(width: r.width*s, height: r.height*s), for: .mediaBox)
  let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
  let H = CGFloat(cg.height), W = CGFloat(cg.width)
  imgs.append(cg.cropping(to: CGRect(x: 0, y: H*0.05, width: W*0.75, height: H*0.17))!)
}
let W = imgs.map{$0.width}.max()!, H = imgs.map{$0.height}.reduce(0,+)
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(.white); ctx.fill(CGRect(x:0,y:0,width:W,height:H))
var y = H
for i in imgs { y -= i.height; ctx.draw(i, in: CGRect(x:0,y:y,width:i.width,height:i.height)); ctx.setFillColor(.black); ctx.fill(CGRect(x:0,y:y,width:W,height:3)) }
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[1]))
