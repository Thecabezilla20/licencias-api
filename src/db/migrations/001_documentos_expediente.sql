-- Run this script once against LicenciasLaredo to add document attachments support
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DocumentosExpediente')
BEGIN
  CREATE TABLE DocumentosExpediente (
    id_documento       INT IDENTITY(1,1) PRIMARY KEY,
    id_expediente      INT NOT NULL,
    nombre_original    NVARCHAR(255) NOT NULL,
    nombre_archivo     NVARCHAR(255) NOT NULL,
    tipo_mime          NVARCHAR(100),
    tamano_bytes       INT,
    id_usuario_subio   INT NOT NULL,
    fecha_subida       DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_DocExp_Expediente FOREIGN KEY (id_expediente) REFERENCES Expedientes(id_expediente) ON DELETE CASCADE,
    CONSTRAINT FK_DocExp_Usuario    FOREIGN KEY (id_usuario_subio) REFERENCES Usuarios(id_usuario)
  );
  PRINT 'Tabla DocumentosExpediente creada.';
END
ELSE
  PRINT 'Tabla DocumentosExpediente ya existe.';
