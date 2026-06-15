import Link from "next/link";
import { Button } from "../ui/Button";
import { Loader2 } from "lucide-react";
import styles from './header.module.css'

interface  NavBarCTAProps {
  status: "authenticated" | "loading" | "unauthenticated"
  buttonSize?: "sm" | "md" | "lg"
  fullWidth?: boolean;
  hideDashboard?: boolean;
  hideCTA?: boolean;
  onClick?: () => void;
}

const NavBarCTA = ({status, buttonSize = "sm", fullWidth=true, hideDashboard=false, hideCTA, onClick}: NavBarCTAProps) => {

  return (
    <div className={`${styles.CTA__container} ${hideCTA? styles.hide : ''}`} >
      {status === "loading" ? (
        <div className="place__center">
          <Loader2 size={25} className="loading_icon" color='var(--neutral-500)' />
        </div>
      ) : status === "authenticated" ? (
        <Link href="/dashboard" onClick={onClick} style={hideDashboard ? {display: 'none'} : {}}>
          <Button size={buttonSize} fullWidth={fullWidth}>Dashboard</Button>
        </Link>
      ) : (
        <Link href="/auth/login" onClick={onClick}>
          <Button size={buttonSize} fullWidth={fullWidth} style={{textWrap: 'nowrap'}}>Sign In</Button>
        </Link>
      )}
    </div> 
  )
}

export default NavBarCTA;
