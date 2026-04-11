import { useCallback, RefObject } from 'react';

/**
 * Hook to manage Draw.io iframe actions
 * @param iframeRef - Reference to the iframe element
 * @returns Action methods to interact with Draw.io
 */
export function useActions(iframeRef: RefObject<HTMLIFrameElement>) {
  /**
   * Send a message to the Draw.io iframe
   * @param message - Message object to send
   */
  const postMessage = useCallback((message: any) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      console.warn('Iframe not ready');
      return;
    }

    try {
      const targetOrigin = (() => {
        try {
          const src = iframeRef.current?.src;
          if (!src) return '*';
          return new URL(src, window.location.href).origin;
        } catch {
          return '*';
        }
      })();

      iframeRef.current.contentWindow.postMessage(
        JSON.stringify(message),
        targetOrigin
      );
    } catch (error) {
      console.error('Failed to send message to Draw.io:', error);
    }
  }, [iframeRef]);

  /**
   * Load a diagram into the editor
   * @param options - Load options
   * @param options.xml - XML diagram data
   * @param options.xmlpng - XML embedded in PNG
   * @param options.descriptor - CSV descriptor
   * @param options.autosave - Enable autosave
   */
  const load = useCallback((options: { xml?: string; xmlpng?: string; descriptor?: any; autosave?: boolean }) => {
    const message: any = {
      action: 'load',
      autosave: options.autosave ? 1 : 0
    };

    if (options.xml !== undefined) {
      message.xml = options.xml || '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
    } else if (options.xmlpng) {
      message.xmlpng = options.xmlpng;
    } else if (options.descriptor) {
      message.descriptor = options.descriptor;
    }

    postMessage(message);
  }, [postMessage]);

  /**
   * Configure the Draw.io editor
   * @param options - Configuration options
   * @param options.config - Configuration object
   */
  const configure = useCallback((options: { config: any }) => {
    postMessage({
      action: 'configure',
      config: options.config
    });
  }, [postMessage]);

  /**
   * Export the current diagram
   * @param options - Export options
   * @param options.format - Export format (png, svg, xmlpng, xmlsvg, etc.)
   * @param options.exit - Whether to exit after export
   * @param options.parentEvent - Parent event name for tracking
   */
  const exportDiagram = useCallback((options: { format?: string; exit?: boolean; parentEvent?: string }) => {
    const message: any = {
      action: 'export',
      format: options.format || 'xmlsvg'
    };

    // Internal use properties
    if (options.exit !== undefined) {
      message.exit = options.exit;
    }
    if (options.parentEvent) {
      message.parentEvent = options.parentEvent;
    }

    postMessage(message);
  }, [postMessage]);

  /**
   * Merge XML into the current diagram
   * @param options - Merge options
   * @param options.xml - XML to merge
   */
  const merge = useCallback((options: { xml: string }) => {
    postMessage({
      action: 'merge',
      xml: options.xml
    });
  }, [postMessage]);

  /**
   * Get the current diagram as XML
   */
  const getXml = useCallback(() => {
    postMessage({
      action: 'export',
      format: 'xml'
    });
  }, [postMessage]);

  /**
   * Prompt the user with a dialog
   * @param options - Prompt options
   * @param options.title - Dialog title
   * @param options.message - Dialog message
   */
  const prompt = useCallback((options: { title: string; message: string }) => {
    postMessage({
      action: 'prompt',
      title: options.title,
      message: options.message
    });
  }, [postMessage]);

  /**
   * Load a template
   * @param options - Template options
   * @param options.xml - Template XML
   */
  const template = useCallback((options: { xml: string }) => {
    postMessage({
      action: 'template',
      xml: options.xml
    });
  }, [postMessage]);

  return {
    load,
    configure,
    exportDiagram,
    merge,
    getXml,
    prompt,
    template
  };
}

/**
 * Type helper for unique action properties
 * This is a placeholder for TypeScript compatibility
 */
export function UniqueActionProps() {
  return {};
}
