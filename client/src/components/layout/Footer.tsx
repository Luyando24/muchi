export default function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">About ZamPortal</h3>
            <p className="text-muted-foreground">
              Your one-stop platform for accessing government services online. We are committed to providing efficient and transparent services to all citizens.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary">Home</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Services</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">FAQs</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
              <a href="#" className="text-muted-foreground hover:text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 2.8 3.2 3 5.2-1.4 1.2-3 2-5 2h-1.5c-1.2 0-2.3-.4-3.2-1.2.9-1.6 1.7-3.2 2.2-4.8-1.6-1.4-3-2.8-4-4 .7-1.3 1.5-2.5 2.5-3.5C13.4 5.1 15 6.5 17 8c-1.2-1.8-2-3.8-2-6h2c.5 2.2 1.5 4.2 3 6Z"></path><path d="M2 22s.7-2.1 2-3.4c-1.6-1.4-2.8-3.2-3-5.2 1.4-1.2 3-2 5-2h1.5c1.2 0 2.3.4 3.2-1.2-.9 1.6-1.7 3.2-2.2 4.8 1.6 1.4 3 2.8 4 4-.7 1.3-1.5 2.5-2.5 3.5C8.6 18.9 7 17.5 5 16c1.2 1.8 2 3.8 2 6H5c-.5-2.2-1.5-4.2-3-6Z"></path></svg></a>
              <a href="#" className="text-muted-foreground hover:text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
            </div>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-muted-foreground">
          &copy; 2024 ZamPortal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}