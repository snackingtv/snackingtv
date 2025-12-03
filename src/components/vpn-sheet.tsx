'use client';

import { useState, useEffect } from 'react';
import { Shield, ChevronDown, Loader, Power, Globe } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

interface Server {
  name: string;
  flag: string; // emoji flag
}

const mockServers: Server[] = [
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Canada', flag: '🇨🇦' },
];

export function VpnSheet() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedServer, setSelectedServer] = useState<Server>(mockServers[0]);

  useEffect(() => {
    const storedStatus = localStorage.getItem('vpnStatus') as ConnectionStatus;
    const storedServer = localStorage.getItem('vpnServer');
    if (storedStatus && storedStatus !== 'connecting' && storedStatus !== 'disconnecting') {
        setStatus(storedStatus);
    }
    if (storedServer) {
        const server = mockServers.find(s => s.name === storedServer);
        if (server) {
            setSelectedServer(server);
        }
    }
  }, []);

  const handleConnectToggle = () => {
    if (status === 'connected') {
      setStatus('disconnecting');
      setTimeout(() => {
        setStatus('disconnected');
        localStorage.setItem('vpnStatus', 'disconnected');
        toast({ title: t('vpn_disconnected_title'), description: t('vpn_disconnected_desc', { server: selectedServer.name }) });
      }, 1500);
    } else if (status === 'disconnected') {
      setStatus('connecting');
      setTimeout(() => {
        setStatus('connected');
        localStorage.setItem('vpnStatus', 'connected');
        localStorage.setItem('vpnServer', selectedServer.name);
        toast({ title: t('vpn_connected_title'), description: t('vpn_connected_desc', { server: selectedServer.name }) });
      }, 2000);
    }
  };

  const handleServerSelect = (server: Server) => {
    if (status === 'disconnected') {
      setSelectedServer(server);
    } else {
      toast({
        variant: 'destructive',
        title: t('vpn_change_server_error_title'),
        description: t('vpn_change_server_error_desc'),
      });
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { text: t('vpn_status_connected'), color: 'text-green-400' };
      case 'connecting':
        return { text: t('vpn_status_connecting'), color: 'text-yellow-400' };
      case 'disconnecting':
        return { text: t('vpn_status_disconnecting'), color: 'text-yellow-400' };
      case 'disconnected':
      default:
        return { text: t('vpn_status_disconnected'), color: 'text-red-400' };
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
                {status === 'connected' && <p className="text-sm text-muted-foreground">{t('vpn_connected_to', { server: selectedServer.name })}</p>}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between" disabled={isLoading || status === 'connected'}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedServer.flag}</span>
                    <span>{selectedServer.name}</span>
                  </div>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                {mockServers.map((server) => (
                  <DropdownMenuItem key={server.name} onSelect={() => handleServerSelect(server)}>
                    <span className="text-2xl mr-2">{server.flag}</span>
                    <span>{server.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
                onClick={handleConnectToggle} 
                disabled={isLoading}
                className={cn("w-full h-12 text-lg", status === 'connected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}
            >
                {isLoading ? (
                    <Loader className="animate-spin" />
                ) : (
                    <>
                        <Power className="mr-2" />
                        {status === 'connected' ? t('vpn_disconnect') : t('vpn_connect')}
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
