Pod::Spec.new do |s|
  s.name         = 'LidarScanner'
  s.version      = '1.0.0'
  s.summary      = 'ARKit LiDAR floor plan scanner for React Native'
  s.license      = { :type => 'MIT' }
  s.authors      = { 'Author' => 'dev@example.com' }
  s.homepage     = 'https://example.com'
  s.platforms    = { :ios => '13.4' }
  s.source       = { :git => '' }
  s.source_files = 'ios/**/*.{h,mm}'
  s.frameworks   = 'ARKit', 'UIKit', 'Metal', 'CoreGraphics', 'SceneKit'
  s.dependency   'React-Core'
end
