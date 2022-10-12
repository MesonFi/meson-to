export default function isMobile (window) {
  const platform = window.navigator.userAgentData?.platform || window.navigator.platform || 'unknown'
  return /(iPhone|iPad|iPod|Linux arm|Linux aar|Android)/.test(platform)
}
