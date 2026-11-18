// Official Wan favicon: https://g.alicdn.com/sail-web/wan-static-resources/0.0.30/images/favicon.ico
import wanIcon from './wan.png'

export function IconWan(props: { size?: number }) {
  return (
    <img
      src={wanIcon}
      alt=''
      width={props.size ?? 20}
      height={props.size ?? 20}
    />
  )
}
