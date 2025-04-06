import { useState, useEffect } from 'react';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function EmailDiagnosticPage() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
  const { toast } = useToast();

  // Obținem datele de diagnosticare la încărcarea paginii
  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/email-diagnostics');
        
        if (!response.ok) {
          throw new Error(`Eroare la obținerea diagnosticului: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setDiagnosticData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'A apărut o eroare la obținerea diagnosticului');
        toast({
          title: 'Eroare',
          description: 'Nu am putut obține datele de diagnosticare',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiagnostics();
  }, [toast]);

  // Funcție pentru trimiterea unui email de test
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Eroare',
        description: 'Adresa de email este obligatorie',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSendingTest(true);
      setTestResult(null);
      
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail }),
      });
      
      const result = await response.json();
      
      setTestResult(result);
      
      toast({
        title: result.success ? 'Succes' : 'Eroare',
        description: result.message || (result.error ? `Eroare: ${result.error}` : 'Operațiune completă'),
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'A apărut o eroare la trimiterea emailului de test',
      });
      
      toast({
        title: 'Eroare',
        description: 'Nu am putut trimite emailul de test',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Diagnosticare Email</h1>
      
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3">Se încarcă diagnosticul...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Eroare</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Configurație Email</CardTitle>
              <CardDescription>Verifică configurația serviciului de email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Elastic Email</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <span className="mr-2">API Key:</span>
                        {diagnosticData?.emailConfigStatus?.apiKeyPresent ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Configurat 
                            ({diagnosticData?.emailConfigStatus?.apiKeyLength} caractere)
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" /> Lipsă
                          </span>
                        )}
                      </li>
                      <li>
                        <span className="mr-2">Expeditor:</span>
                        <code className="bg-gray-100 px-1 py-0.5 rounded">
                          {diagnosticData?.emailConfigStatus?.fromEmail || 'N/A'}
                        </code>
                      </li>
                      <li>
                        <span className="mr-2">API URL:</span>
                        <code className="bg-gray-100 px-1 py-0.5 rounded">
                          {diagnosticData?.emailConfigStatus?.baseUrl || 'N/A'}
                        </code>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Variabile de mediu</h3>
                    <ul className="space-y-2">
                      <li>
                        <span className="mr-2">ELASTIC_EMAIL_API_KEY:</span>
                        {diagnosticData?.emailConfigStatus?.elasticEmailEnvVar === 'set' ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Configurat
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" /> Lipsă
                          </span>
                        )}
                      </li>
                      <li>
                        <span className="mr-2">NODE_ENV:</span>
                        <code className="bg-gray-100 px-1 py-0.5 rounded">
                          {diagnosticData?.environmentVariables?.nodeEnv || 'N/A'}
                        </code>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {diagnosticData?.emailConfigStatus?.serviceConfig && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Diagnostic EmailService</h3>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(diagnosticData.emailConfigStatus.serviceConfig, null, 2)}
                    </pre>
                  </div>
                )}
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Diagnostic sistem</AlertTitle>
                  <AlertDescription>
                    {diagnosticData?.emailConfigStatus?.apiKeyPresent 
                      ? 'Configurația serviciului de email pare corectă. Poți trimite un email de test pentru a verifica funcționalitatea.' 
                      : 'API Key-ul pentru Elastic Email nu este configurat sau nu este accesibil. Verifică variabilele de mediu.'}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Email de test</CardTitle>
              <CardDescription>Trimite un email de test pentru a verifica funcționalitatea</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="testEmail">Adresă email pentru test</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="exemplu@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                
                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'} className="mt-4">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{testResult.success ? 'Succes' : 'Eroare'}</AlertTitle>
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => window.history.back()}>
                Înapoi
              </Button>
              <Button onClick={handleSendTestEmail} disabled={sendingTest || !testEmail}>
                {sendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  'Trimite email de test'
                )}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}