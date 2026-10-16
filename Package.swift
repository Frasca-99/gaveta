// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Gaveta",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "Gaveta", path: "Sources/Gaveta")
    ]
)
