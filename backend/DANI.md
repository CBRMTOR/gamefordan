Dear Dan,
customizing a code is the hardest approach to build a system (my opinion). I don't believe, personally, this code will solve what you are going to build. Consider developing your app from scratch asap because this won't help you than killing your time. Any way here are the some clues for you
1. I have indented he code well so you can read and understand it but I couldn't finish commenting. only the auth pats are commented.==== comments may start with "//" or "{/*" 
2. If you want to add analytics for admins, there is a hidden/commented menu in GameAdmin.js which you can enable whenever you want.
3. Styles are developed with MUI, consider your styling be like that or you can use css or tailwind as you wish for what you will develop next.
4. In some parts of the code, you might find >1000 lines of code with long definations, consider spliting the code
6. when you create react app, you will get /Gamify/README.md..this will guide you doccumentation about REACT; but I dont recommend that use the 
    A. Mozzila developers: a site where you get everything about javascript
    B. React.dev:
    C. FreeCodeCamp (the best ever)
    D.Ask GPT about the topic
<----------------------------------------------------------------------->
--------------------------Security- The most attention------------------

Your app supports file uploads like images, videos, pdfs etc and it has many input fiels for comments and posts so on. Input fields are the most sources of vulnerability. NEVER leave a single input field unsanitized Dani especially for the file upload.

=========================1 FILE UPLOAD VULNERABILITY ================
This happens when I upload shells and scripts to your server. the shell might be wriiten by python, C# etc but if your system allows a file upload, the can controle the whole system even to spread malware(trojan and worms).
Eg file types1, 1 file.py.pdf, file.txt,py.pdf, 3.file.pdf.py etc files
Addtional: sql injection: this is when they get a vulnerability on input fields and when they excute commands like update users set role = 'admin' where username(id) = 'their username/id), It is called privilege escalation. TAKE CARE OF THIS AGAIN.
READ the owasp top 10 vulnerabilities Dan. That's so quite serious.

