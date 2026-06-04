import Link from "next/link";
import { Button } from "../ui/Button";
import { Loader2 } from "lucide-react";


interface  NavBarCTAProps {
  status: "authenticated" | "loading" | "unauthenticated"
}

const NavBarCTA = ({status}: NavBarCTAProps) => {
  return (
    status === "loading" ? (
      <Loader2 size={25} className="loading_icon" color='var(--neutral-500)' />
    ) : status === "authenticated" ? (
      <Link href="/dashboard">
        <Button size="sm">Dashboard</Button>
      </Link>
    ) : (
      <Link href="/auth/login">
        <Button size="sm" className="nowrap">Sign In</Button>
      </Link>
    )
  )
}

export default NavBarCTA;
