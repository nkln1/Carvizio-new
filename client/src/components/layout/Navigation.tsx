import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/">
            <span className="text-2xl font-bold text-primary cursor-pointer">Carvizio</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search">
              <span className="text-gray-700 hover:text-primary transition-colors cursor-pointer">
                Search Cars
              </span>
            </Link>
            <Link href="/sell">
              <span className="text-gray-700 hover:text-primary transition-colors cursor-pointer">
                Sell Your Car
              </span>
            </Link>
            <Link href="/about">
              <span className="text-gray-700 hover:text-primary transition-colors cursor-pointer">
                About Us
              </span>
            </Link>
            <Button>Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/search">
                <span className="block px-3 py-2 text-gray-700 hover:text-primary transition-colors cursor-pointer">
                  Search Cars
                </span>
              </Link>
              <Link href="/sell">
                <span className="block px-3 py-2 text-gray-700 hover:text-primary transition-colors cursor-pointer">
                  Sell Your Car
                </span>
              </Link>
              <Link href="/about">
                <span className="block px-3 py-2 text-gray-700 hover:text-primary transition-colors cursor-pointer">
                  About Us
                </span>
              </Link>
              <Button className="w-full mt-4">Get Started</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}