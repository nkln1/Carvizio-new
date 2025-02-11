import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="fixed w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/">
            <a className="text-2xl font-bold text-primary">Carvizio</a>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features">
              <a className="text-gray-700 hover:text-primary">Features</a>
            </Link>
            <Link href="#benefits">
              <a className="text-gray-700 hover:text-primary">Benefits</a>
            </Link>
            <Link href="#contact">
              <a className="text-gray-700 hover:text-primary">Contact</a>
            </Link>
            <Button>Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" onClick={toggleMenu}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="#features">
                <a className="block px-3 py-2 text-gray-700 hover:text-primary">
                  Features
                </a>
              </Link>
              <Link href="#benefits">
                <a className="block px-3 py-2 text-gray-700 hover:text-primary">
                  Benefits
                </a>
              </Link>
              <Link href="#contact">
                <a className="block px-3 py-2 text-gray-700 hover:text-primary">
                  Contact
                </a>
              </Link>
              <Button className="w-full mt-4">Get Started</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
