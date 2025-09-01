import React from 'react';
import Logo from './Logo';
import { Mail, Phone, MapPin, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" }
  ];

  const quickLinks = [
    { label: "About Us", href: "#" },
    { label: "Courses", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" }
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="lg:col-span-2">
            <Logo size="md" className="mb-4" />
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
              Illuminating the path to victory in every exam. Join thousands of students 
              who are transforming their exam preparation with our gamified learning platform.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>hello@ujjwaldeep.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>New Delhi, India</span>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4 font-heading">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Social Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4 font-heading">Connect With Us</h3>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 bg-muted hover:bg-gradient-primary hover:text-primary-foreground rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-warm"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            
            {/* Newsletter Signup */}
            <div className="mt-6">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Stay Updated</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button className="px-3 py-2 bg-gradient-primary text-primary-foreground text-xs font-semibold rounded-md hover:shadow-warm transition-all duration-300">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2024 UjjwalDeep. All rights reserved. Made with ❤️ in India.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>🎯 Exam Ready</span>
            <span>🚀 AI Powered</span>
            <span>💰 Affordable</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;