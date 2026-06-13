import Link from "next/link";
import { Button } from "../ui/Button";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";


interface  NavBarCTAProps {
  status: "authenticated" | "loading" | "unauthenticated"
  buttonSize?: "sm" | "md" | "lg"
  fullWidth?: boolean;
  hideDashboard?: boolean;
  onClick?: () => void;
}

const NavBarCTA = ({status, buttonSize = "sm", fullWidth=true, hideDashboard=false, onClick}: NavBarCTAProps) => {

  return (
    <motion.div layoutId='CTA'>
      {
        status === "loading" ? (
          <Loader2 size={25} className="loading_icon" color='var(--neutral-500)' />
        ) : status === "authenticated" ? (
          <Link href="/dashboard" onClick={onClick} style={hideDashboard ? {display: 'none'} : {}}>
            <Button size={buttonSize} fullWidth={fullWidth}>Dashboard</Button>
          </Link>
        ) : (
          <Link href="/auth/login" onClick={onClick}>
            <Button size={buttonSize} fullWidth={fullWidth} style={{textWrap: 'nowrap'}}>Sign In</Button>
          </Link>
        )
      }
    </motion.div>
  )
}

export default NavBarCTA;
