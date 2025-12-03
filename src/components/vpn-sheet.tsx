'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader, Power, Globe, Check, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProxyStore } from '@/lib/proxy-store';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

export function VpnSheet() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { proxyUrl, setProxyUrl, clearProxyUrl } = useProxyStore();
  
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [inputUrl, setInputUrl] = useState('');

  useEffect(() => {
    if (proxyUrl) {
      setStatus('connected');
      setInputUrl(proxyUrl);
    } else {
      setStatus('disconnected');
      setInputUrl('');
    }
  }, [proxyUrl]);

  const handleConnectToggle = () => {
    if (status === 'connected') {
      setStatus('disconnecting');
      setTimeout(() => {
        clearProxyUrl();
        toast({ title: t('proxy_disconnected_title'), description: t('proxy_disconnected_desc') });
      }, 1000);
    } else if (status === 'disconnected') {
      if (!inputUrl || !inputUrl.startsWith('http')) {
        toast({ variant: 'destructive', title: t('proxy_invalid_url_title'), description: t('proxy_invalid_url_desc') });
        return;
      }
      setStatus('connecting');
      setTimeout(() => {
        setProxyUrl(inputUrl);
        toast({ title: t('proxy_connected_title'), description: t('proxy_connected_desc') });
      }, 1500);
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { text: t('proxy_status_connected'), color: 'text-green-400' };
      case 'connecting':
        return { text: t('proxy_status_connecting'), color: 'text-yellow-400' };
      case 'disconnecting':
        return { text: t('proxy_status_disconnecting'), color: 'text-yellow-400' };
      case 'disconnected':
      default:
        return { text: t('proxy_status_disconnected'), color: 'text-red-400' };
    }
  };

  const statusInfo = getStatusInfo();
  const isLoading = status === 'connecting' || status === 'disconnecting';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="group" style={{ cursor: 'pointer' }}>
          <Card className="overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[16/9] transition-transform duration-200 ease-in-out group-hover:scale-105 flex items-center justify-center">
            <Shield className="h-8 w-8 text-zinc-400 group-hover:text-white" />
          </Card>
          <p className="mt-2 text-xs text-zinc-300 truncate group-hover:text-white text-center">
            {t('vpn_title')}
          </p>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto rounded-t-lg mx-2 mb-2 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-center">{t('vpn_title')}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-6 flex-grow">
            <div className="flex flex-col items-center gap-2">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center transition-all", 
                    status === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'
                )}>
                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center transition-all",
                         status === 'connected' ? 'bg-green-500/30' : 'bg-red-500/30'
                    )}>
                        <Globe className={cn("h-8 w-8 transition-colors", status === 'connected' ? 'text-green-400' : 'text-red-400')} />
                    </div>
                </div>
                <p className={cn("font-semibold", statusInfo.color)}>{statusInfo.text}</p>
                {status === 'connected' && <p className="text-sm text-muted-foreground break-all">{proxyUrl}</p>}
            </div>

            <div className="space-y-2">
                <label htmlFor="proxy-url" className="text-sm font-medium">{t('proxy_server_url')}</label>
                <div className="flex gap-2">
                    <Input
                        id="proxy-url"
                        placeholder="http://user:pass@host:port"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        disabled={isLoading || status === 'connected'}
                    />
                </div>
            </div>

            <Button 
                onClick={handleConnectToggle} 
                disabled={isLoading || (status === 'disconnected' && !inputUrl)}
                className={cn("w-full h-12 text-lg", status === 'connected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}
            >
                {isLoading ? (
                    <Loader className="animate-spin" />
                ) : (
                    <>
                        <Power className="mr-2" />
                        {status === 'connected' ? t('proxy_disconnect') : t('proxy_connect')}
                    </>
                )}
            </Button>
        </div>
        <div className="p-4 border-t border-border mt-auto">
            <p className="text-center text-xs text-muted-foreground">{t('vpn_disclaimer')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
